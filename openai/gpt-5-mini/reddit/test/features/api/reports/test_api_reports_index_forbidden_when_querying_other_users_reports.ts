import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalReport";

/**
 * Validate that a member cannot list reports submitted by another user.
 *
 * Business context:
 *
 * - Members may file reports against posts. Member-scoped report listing
 *   endpoints must not reveal other members' reports. This test verifies that a
 *   regular member (userA) cannot retrieve reports filed by another member
 *   (userB) by filtering with postId. Because the official request DTO does not
 *   include reporterUserId, this test uses postId as the access-control pivot.
 *   The test accepts either a Forbidden error OR an empty result set as correct
 *   enforcement.
 *
 * Steps:
 *
 * 1. Register userA and userB (separate connection contexts: connA, connB).
 * 2. As userB: create community, create a post, and file a report against that
 *    post.
 * 3. As userA: attempt to list reports filtered by userB's postId. Expect either a
 *    thrown error (forbidden) or an empty page.data result.
 * 4. As userA: create their own community/post and file a report against it. Then
 *    list reports for that postId and assert the report is visible to userA.
 */
export async function test_api_reports_index_forbidden_when_querying_other_users_reports(
  connection: api.IConnection,
) {
  // 0. Utility helpers (inside test to avoid adding external imports)
  const makeJoinBody = (username: string, email: string) => {
    return {
      username,
      email,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPortalMember.ICreate;
  };

  // 1. Create two independent connection contexts for userA and userB
  const connA: api.IConnection = { ...connection, headers: {} };
  const connB: api.IConnection = { ...connection, headers: {} };

  // 2. Register userA
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAName = `userA_${RandomGenerator.alphaNumeric(6)}`;
  const userA: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connA, {
      body: makeJoinBody(userAName, userAEmail),
    });
  typia.assert(userA);

  // 3. Register userB
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBName = `userB_${RandomGenerator.alphaNumeric(6)}`;
  const userB: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connB, {
      body: makeJoinBody(userBName, userBEmail),
    });
  typia.assert(userB);

  // 4. As userB: create a community
  const communityB: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connB, {
      body: {
        name: `c-${RandomGenerator.name(2)}-${RandomGenerator.alphaNumeric(4)}`,
        slug: `c-${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph({ sentences: 6 }),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(communityB);

  // 5. As userB: create a text post in the community
  const postB: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connB, {
      body: {
        community_id: communityB.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPortalPost.ICreate,
    });
  typia.assert(postB);

  // 6. As userB: file a report against postB
  const reportB: ICommunityPortalReport =
    await api.functional.communityPortal.member.posts.reports.create(connB, {
      postId: postB.id,
      body: {
        reasonCode: "spam",
        reasonText: "Automated test report - spam",
        isUrgent: false,
      } satisfies ICommunityPortalReport.ICreate,
    });
  typia.assert(reportB);

  // 7. As userA: attempt to list reports for postB.id. Accept either forbidden
  //    error OR empty results as valid enforcement. We first try to call the
  //    index endpoint and, on success, assert empty results; on exception,
  //    re-execute inside TestValidator.error with the same request to validate
  //    an expected error behavior.
  try {
    const pageForB: IPageICommunityPortalReport.ISummary =
      await api.functional.communityPortal.member.reports.index(connA, {
        body: {
          postId: postB.id,
          limit: 10,
          offset: 0,
        } satisfies ICommunityPortalReport.IRequest,
      });
    typia.assert(pageForB);
    TestValidator.predicate(
      "userA should not see reports filed by userB (empty page.data)",
      Array.isArray(pageForB.data) && pageForB.data.length === 0,
    );
  } catch (exp) {
    // If the server rejects the cross-user query, assert that an error is
    // thrown. Re-execute the same request inside TestValidator.error so the
    // test harness captures the error in its controlled assertion.
    await TestValidator.error(
      "userA forbidden to query other user's reports (expected)",
      async () => {
        await api.functional.communityPortal.member.reports.index(connA, {
          body: {
            postId: postB.id,
            limit: 10,
            offset: 0,
          } satisfies ICommunityPortalReport.IRequest,
        });
      },
    );
  }

  // 8. Verify userA can list their OWN reports:
  //    Create a community and post as userA, then file a report as userA, and
  //    ensure reports.index returns that report when filtered by that postId.
  const communityA: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connA, {
      body: {
        name: `c-${RandomGenerator.name(2)}-${RandomGenerator.alphaNumeric(4)}`,
        slug: `c-${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(communityA);

  const postA: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connA, {
      body: {
        community_id: communityA.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPortalPost.ICreate,
    });
  typia.assert(postA);

  const reportA: ICommunityPortalReport =
    await api.functional.communityPortal.member.posts.reports.create(connA, {
      postId: postA.id,
      body: {
        reasonCode: "other",
        reasonText: "Report by userA for own test post",
        isUrgent: false,
      } satisfies ICommunityPortalReport.ICreate,
    });
  typia.assert(reportA);

  // List reports for postA as userA and assert presence
  const pageForA: IPageICommunityPortalReport.ISummary =
    await api.functional.communityPortal.member.reports.index(connA, {
      body: {
        postId: postA.id,
        limit: 10,
        offset: 0,
      } satisfies ICommunityPortalReport.IRequest,
    });
  typia.assert(pageForA);

  TestValidator.predicate(
    "userA should see their own report in results",
    Array.isArray(pageForA.data) &&
      pageForA.data.some((s) => s.post_id === postA.id),
  );
}
