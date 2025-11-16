import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAttachment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentAttachment";

/**
 * Test that an authenticated user can retrieve a paginated list of attachments
 * for a comment they own.
 *
 * 1. Register a new user.
 * 2. Create a comment owned by this user (requires specifying a valid post_id; as
 *    post API is not in scope, simulate with a UUID).
 * 3. Retrieve attachments for that comment with default/empty attachment state and
 *    pagination parameters.
 * 4. Verify paged response shape, correct data structure, and check that the list
 *    is empty (since no attachments exist yet).
 * 5. Test pagination edge cases: non-default limit/offset, filters that would
 *    still return no results.
 * 6. (Attachment creation is not in function scope.)
 * 7. Confirm that only the correct user's session can access (cross-user attempts
 *    are not possible here due to absence of other users in scenario).
 */
export async function test_api_comment_attachment_listing_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user and extract token and session
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(12);
  const authorized: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(authorized);

  // 2. Simulate a created comment by user (need valid post_id, simulate UUID)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const createCommentBody = {
    post_id: postId,
    body: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 12 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.user.comments.create(connection, {
      body: createCommentBody,
    });
  typia.assert(comment);

  // 3. List attachments for the created comment, default (no filters, default pagination)
  const emptySearchBody =
    {} satisfies ICommunityPlatformCommentAttachment.IRequest;
  const page1: IPageICommunityPlatformCommentAttachment.ISummary =
    await api.functional.communityPlatform.user.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
        body: emptySearchBody,
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "first page is empty",
    Array.isArray(page1.data) && page1.data.length,
    0,
  );

  // 4. Paginate with limit/offset that should still give empty
  const searchWithLimit: ICommunityPlatformCommentAttachment.IRequest = {
    limit: 5,
    offset: 0,
  } satisfies ICommunityPlatformCommentAttachment.IRequest;
  const page2: IPageICommunityPlatformCommentAttachment.ISummary =
    await api.functional.communityPlatform.user.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
        body: searchWithLimit,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "page2 still empty with limit",
    Array.isArray(page2.data) && page2.data.length,
    0,
  );

  // 5. Paginate with offset beyond zero
  const searchWithOffset: ICommunityPlatformCommentAttachment.IRequest = {
    limit: 3,
    offset: 10,
  } satisfies ICommunityPlatformCommentAttachment.IRequest;
  const page3: IPageICommunityPlatformCommentAttachment.ISummary =
    await api.functional.communityPlatform.user.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
        body: searchWithOffset,
      },
    );
  typia.assert(page3);
  TestValidator.equals(
    "page3 still empty with offset",
    Array.isArray(page3.data) && page3.data.length,
    0,
  );

  // 6. Try with sort and a user_session_id filter set to a random UUID (simulating this session, should still be empty)
  const searchWithSession: ICommunityPlatformCommentAttachment.IRequest = {
    user_session_id: typia.random<string & tags.Format<"uuid">>(),
    sort_by: "created_at",
    sort_order: "asc",
  } satisfies ICommunityPlatformCommentAttachment.IRequest;
  const page4: IPageICommunityPlatformCommentAttachment.ISummary =
    await api.functional.communityPlatform.user.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
        body: searchWithSession,
      },
    );
  typia.assert(page4);
  TestValidator.equals(
    "page4 still empty with user_session filter",
    Array.isArray(page4.data) && page4.data.length,
    0,
  );
}
