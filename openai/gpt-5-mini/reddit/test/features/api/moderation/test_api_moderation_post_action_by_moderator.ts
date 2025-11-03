import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityModerator";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerationAction";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_moderation_post_action_by_moderator(
  connection: api.IConnection,
) {
  // 1) Create an author (community member) who will create the community and post
  const authorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `author_${RandomGenerator.alphaNumeric(6)}`,
    password: "Passw0rd!",
    session_context: {
      href: "http://localhost/",
      referrer: "http://localhost/",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const author: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: authorBody,
    });
  typia.assert(author);

  // 2) Create a community as the author
  const communityBody = {
    name: `test-community-${Date.now()}`,
    slug: `test-community-${Date.now()}`,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
    visibility: "public",
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3) Create a post in the community as the author
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    post_type: "text",
  } satisfies ICommunityBbsPost.ICreate;

  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: postBody,
      },
    );
  typia.assert(post);

  // 4) Create a separate community member account that will act as moderator
  // Note: Assigning the moderator role to this account must be done externally
  // by test fixtures or seed data. The test generates a moderator assignment id
  // that the fixture should map to an actual community_bbs_community_moderators.id.
  const unauthModeratorConn: api.IConnection = { ...connection, headers: {} };

  const moderatorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `moderator_${RandomGenerator.alphaNumeric(6)}`,
    password: "Passw0rd!",
    session_context: {
      href: "http://localhost/",
      referrer: "http://localhost/",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const moderatorAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(unauthModeratorConn, {
      body: moderatorBody,
    });
  typia.assert(moderatorAuth);

  // IMPORTANT: The moderator assignment id must exist in the DB and must be
  // associated with the moderatorAuth.member and the created community. The
  // test environment should seed an assignment and provide its id mapping to
  // the value used below. We generate a uuid here; the test runner must ensure
  // it corresponds to a real community moderator assignment.
  const moderatorAssignmentId = typia.random<string & tags.Format<"uuid">>();

  // 5) As the moderator, record a 'remove' moderation action against the post
  const actionBody = {
    moderator_id: moderatorAssignmentId,
    action_type: "remove",
    reason_code: "policy_violation",
    note: "Automated E2E test: removing post for verification",
    origin_report_id: null,
    expires_at: null,
  } satisfies ICommunityBbsModerationAction.ICreate;

  const action: ICommunityBbsModerationAction =
    await api.functional.communityBbs.communityMember.moderation.posts.actions.takeAction(
      unauthModeratorConn,
      {
        postId: post.id,
        body: actionBody,
      },
    );
  typia.assert(action);

  // 6) Validate the moderation action response references the correct post
  TestValidator.equals(
    "moderation action references target post",
    action.target?.target_id,
    post.id,
  );
  TestValidator.equals(
    "moderation action type is remove",
    action.action_type,
    "remove",
  );
  TestValidator.predicate(
    "moderation action contains moderator id",
    action.moderator_id !== null && action.moderator_id !== undefined,
  );

  // 7) Negative test: original author (non-moderator) should not be allowed
  // to perform the same moderation action; expect an error (authorization)
  await TestValidator.error(
    "non-moderator cannot perform moderation action",
    async () => {
      await api.functional.communityBbs.communityMember.moderation.posts.actions.takeAction(
        connection, // still authenticated as author
        {
          postId: post.id,
          body: {
            moderator_id: moderatorAssignmentId,
            action_type: "remove",
            reason_code: "policy_violation",
            note: "Attempt by non-moderator",
            origin_report_id: null,
            expires_at: null,
          } satisfies ICommunityBbsModerationAction.ICreate,
        },
      );
    },
  );
}
