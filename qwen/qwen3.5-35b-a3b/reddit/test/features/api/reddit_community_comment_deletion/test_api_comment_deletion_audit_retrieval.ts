import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentDeletion";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentDeletion";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_deletion_audit_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test comment deletion audit retrieval functionality.
   *
   * Note: This test validates the audit endpoint structure and filtering.
   * Actual deletion records require a deleted comment, which requires a
   * separate DELETE endpoint not available in this SDK. The test validates
   * that the endpoint handles empty responses gracefully.
   */
  // 1. Create moderator user account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 2. Create new connection with moderator token
  const moderatorActorConnection: api.IConnection = { host: connection.host };
  moderatorActorConnection.headers = {
    Authorization: moderatorAuth.token.access,
  };
  // 3. Create a test comment using a mock comment ID for audit testing
  // Since there's no DELETE endpoint in SDK, we test with random UUID
  // The audit endpoint should return empty array for non-existent deletions
  const mockCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve deletion audit trail (will return empty if no deletions exist)
  const auditResponse =
    await api.functional.redditCommunity.comments.deletions.index(
      moderatorActorConnection,
      {
        commentId: mockCommentId,
        body: {
          deleted_by_id: null,
          deletion_reason: null,
        } satisfies IRedditCommunityCommentDeletion.IRequest,
      },
    );
  typia.assert(auditResponse);
  // 5. Validate audit response has data array
  TestValidator.equals(
    "audit response has data array",
    auditResponse.data instanceof Array,
    true,
  );
  // 6. Validate audit response has pagination metadata
  TestValidator.equals(
    "audit response has pagination",
    auditResponse.pagination instanceof Object,
    true,
  );
  // 7. Validate pagination has required fields
  TestValidator.equals(
    "pagination has current page >= 1",
    auditResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has limit > 0",
    auditResponse.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination has records >= 0",
    auditResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages >= 0",
    auditResponse.pagination.pages >= 0,
    true,
  );
  // 8. Validate empty deletion records are acceptable when no deletions exist
  TestValidator.equals(
    "can have zero deletion records",
    auditResponse.pagination.records === 0,
    true,
  );
  // 9. Test filtering by deleted_by_id (null = any actor)
  const filteredByActorResponse =
    await api.functional.redditCommunity.comments.deletions.index(
      moderatorActorConnection,
      {
        commentId: mockCommentId,
        body: {
          deleted_by_id: null,
          deletion_reason: null,
        } satisfies IRedditCommunityCommentDeletion.IRequest,
      },
    );
  typia.assert(filteredByActorResponse);
  TestValidator.equals(
    "filtering by actor returns data array",
    filteredByActorResponse.data instanceof Array,
    true,
  );
  // 10. Test filtering by deletion reason
  const filteredByReasonResponse =
    await api.functional.redditCommunity.comments.deletions.index(
      moderatorActorConnection,
      {
        commentId: mockCommentId,
        body: {
          deleted_by_id: null,
          deletion_reason: "spam",
        } satisfies IRedditCommunityCommentDeletion.IRequest,
      },
    );
  typia.assert(filteredByReasonResponse);
  TestValidator.equals(
    "filtering by reason returns data array",
    filteredByReasonResponse.data instanceof Array,
    true,
  );
  // 11. Test sorting by deleted_at descending
  const sortedDescResponse =
    await api.functional.redditCommunity.comments.deletions.index(
      moderatorActorConnection,
      {
        commentId: mockCommentId,
        body: {
          deleted_by_id: null,
          deletion_reason: null,
          sort: "-deleted_at",
        } satisfies IRedditCommunityCommentDeletion.IRequest,
      },
    );
  typia.assert(sortedDescResponse);
  TestValidator.equals(
    "sorting descending returns data array",
    sortedDescResponse.data instanceof Array,
    true,
  );
  // 12. Test sorting by deleted_at ascending
  const sortedAscResponse =
    await api.functional.redditCommunity.comments.deletions.index(
      moderatorActorConnection,
      {
        commentId: mockCommentId,
        body: {
          deleted_by_id: null,
          deletion_reason: null,
          sort: "deleted_at",
        } satisfies IRedditCommunityCommentDeletion.IRequest,
      },
    );
  typia.assert(sortedAscResponse);
  TestValidator.equals(
    "sorting ascending returns data array",
    sortedAscResponse.data instanceof Array,
    true,
  );
  // 13. Test pagination parameters
  const paginatedResponse =
    await api.functional.redditCommunity.comments.deletions.index(
      moderatorActorConnection,
      {
        commentId: mockCommentId,
        body: {
          deleted_by_id: null,
          deletion_reason: null,
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommentDeletion.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination with limit returns data array",
    paginatedResponse.data instanceof Array,
    true,
  );
  // 14. Test date range filtering
  const dateRangeFrom = new Date();
  const dateRangeFromTimestamp = dateRangeFrom
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
  const dateRangeTo = new Date();
  dateRangeTo.setMinutes(dateRangeTo.getMinutes() + 1);
  const dateRangeToTimestamp = dateRangeTo
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
  const dateFilteredResponse =
    await api.functional.redditCommunity.comments.deletions.index(
      moderatorActorConnection,
      {
        commentId: mockCommentId,
        body: {
          deleted_by_id: null,
          deletion_reason: null,
          deleted_atFrom: dateRangeFromTimestamp,
          deleted_atTo: dateRangeToTimestamp,
        } satisfies IRedditCommunityCommentDeletion.IRequest,
      },
    );
  typia.assert(dateFilteredResponse);
  TestValidator.equals(
    "date filtering returns data array",
    dateFilteredResponse.data instanceof Array,
    true,
  );
  // 15. Test combined filters
  const combinedFiltersResponse =
    await api.functional.redditCommunity.comments.deletions.index(
      moderatorActorConnection,
      {
        commentId: mockCommentId,
        body: {
          deleted_by_id: null,
          deletion_reason: null,
          page: 1,
          limit: 20,
          sort: "-deleted_at",
          deleted_atFrom: dateRangeFromTimestamp,
          deleted_atTo: dateRangeToTimestamp,
        } satisfies IRedditCommunityCommentDeletion.IRequest,
      },
    );
  typia.assert(combinedFiltersResponse);
  TestValidator.equals(
    "combined filters return data array",
    combinedFiltersResponse.data instanceof Array,
    true,
  );
}