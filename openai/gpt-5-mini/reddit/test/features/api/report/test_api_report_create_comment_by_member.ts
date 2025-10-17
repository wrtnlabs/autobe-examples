import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";

export async function test_api_report_create_comment_by_member(
  connection: api.IConnection,
) {
  /**
   * Happy-path: Member reports a comment.
   *
   * Notes:
   *
   * - The ICommunityPortalReport.ICreate type in the provided structures is
   *   declared as `any` in the SDK. We still use the declared type name in
   *   `satisfies` expressions for readability, but the alias may be `any` at
   *   compile-time. This is a documentation artifact of the provided DTOs.
   * - The report request uses camelCase (commentId, reasonCode) to align with the
   *   ICommunityPortalReport structure. If the backend expects snake_case
   *   (comment_id, reason_code), update the request body accordingly.
   */

  // 1) Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = `user_${RandomGenerator.alphaNumeric(8)}`;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "P@ssw0rd!23",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(member);

  // 2) Create community
  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: `c-${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(community);

  // 3) Create a text post in the community
  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ICommunityPortalPost.ICreate,
    });
  typia.assert(post);

  // 4) Create a top-level comment on the post
  const comment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          parent_comment_id: null,
          body: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPortalComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5) Create a report targeting the comment
  const reportBody = {
    // Use camelCase to match ICommunityPortalReport structure from DTOs.
    commentId: comment.id,
    reasonCode: "spam",
    reasonText: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPortalReport.ICreate;

  const report: ICommunityPortalReport =
    await api.functional.communityPortal.member.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // Validations
  TestValidator.equals(
    "reporter user id should match created member",
    report.reporterUserId,
    member.id,
  );
  TestValidator.equals(
    "report references the proper comment",
    report.commentId,
    comment.id,
  );
  TestValidator.predicate(
    "report has createdAt timestamp",
    report.createdAt !== null && report.createdAt !== undefined,
  );
}
