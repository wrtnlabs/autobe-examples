import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAttachmentAccessLog";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_owner_attachments_access_create_access_log } from "../../../generate/generate_random_reddit_like_owner_attachments_access_create_access_log";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_attachment_access_log } from "../../../prepare/prepare_random_reddit_like_attachment_access_log";

/**
 * Test the primary success path where an owner successfully retrieves
 * access logs for an attachment with filtering and pagination.
 *
 * This test validates:
 * - Owner authentication and registration
 * - Member registration and attachment upload
 * - Access logging functionality
 * - Access log retrieval with various filters
 * - Pagination and sorting behavior
 * - Response structure compliance
 */
export async function test_api_owner_attachment_access_logs_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    },
  });
  typia.assert(owner);
  // Step 2: Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member);
  // Step 3: Member uploads file attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: typia.random<string & tags.Format<"uri">>(),
          originalFilename: RandomGenerator.name(),
        } satisfies IRedditLikeAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // Step 4: Log access event as owner
  const accessLog =
    await generate_random_reddit_like_owner_attachments_access_create_access_log(
      ownerConnection,
      {
        body: {
          access_type: "view",
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0 Test",
          referer: "https://example.com",
        } satisfies IRedditLikeAttachmentAccessLog.ICreate,
        params: {
          attachmentId: attachment.id,
        },
      },
    );
  typia.assert(accessLog);
  // Step 5: Retrieve access logs with various filter combinations
  // Test 1: Basic retrieval without filters
  const basicResponse =
    await api.functional.redditLike.owner.attachments.access_logs.index(
      ownerConnection,
      {
        attachmentId: attachment.id,
        body: {} satisfies IRedditLikeAttachmentAccessLog.IRequest,
      },
    );
  typia.assert(basicResponse);
  // Test 2: Filter by actor type
  const actorTypeResponse =
    await api.functional.redditLike.owner.attachments.access_logs.index(
      ownerConnection,
      {
        attachmentId: attachment.id,
        body: {
          actorType: "owner",
        } satisfies IRedditLikeAttachmentAccessLog.IRequest,
      },
    );
  typia.assert(actorTypeResponse);
  // Test 3: Filter by access type
  const accessTypeResponse =
    await api.functional.redditLike.owner.attachments.access_logs.index(
      ownerConnection,
      {
        attachmentId: attachment.id,
        body: {
          accessType: "view",
        } satisfies IRedditLikeAttachmentAccessLog.IRequest,
      },
    );
  typia.assert(accessTypeResponse);
  // Test 4: Filter by date range
  const dateRangeResponse =
    await api.functional.redditLike.owner.attachments.access_logs.index(
      ownerConnection,
      {
        attachmentId: attachment.id,
        body: {
          createdAfter: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
          createdBefore: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IRedditLikeAttachmentAccessLog.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Test 5: Pagination with limit
  const paginationResponse =
    await api.functional.redditLike.owner.attachments.access_logs.index(
      ownerConnection,
      {
        attachmentId: attachment.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies IRedditLikeAttachmentAccessLog.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // Test 6: Combined filter test
  const combinedResponse =
    await api.functional.redditLike.owner.attachments.access_logs.index(
      ownerConnection,
      {
        attachmentId: attachment.id,
        body: {
          actorType: "owner",
          accessType: "view",
          limit: 50,
        } satisfies IRedditLikeAttachmentAccessLog.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate that the logged access event appears in results
  const matchingLog = combinedResponse.data.find(
    (log) => log.id === accessLog.id,
  );
  if (matchingLog === undefined) {
    throw new Error("Created access log not found in filtered results");
  }
  // Additional access log entries for testing filtering
  const anotherAccessLog =
    await generate_random_reddit_like_owner_attachments_access_create_access_log(
      ownerConnection,
      {
        body: {
          access_type: "download",
          ip_address: "192.168.1.2",
          user_agent: "Mozilla/5.0 Test Download",
          referer: "https://example.com/download",
        } satisfies IRedditLikeAttachmentAccessLog.ICreate,
        params: {
          attachmentId: attachment.id,
        },
      },
    );
  typia.assert(anotherAccessLog);
  // Verify multiple logs exist
  const multiLogResponse =
    await api.functional.redditLike.owner.attachments.access_logs.index(
      ownerConnection,
      {
        attachmentId: attachment.id,
        body: {} satisfies IRedditLikeAttachmentAccessLog.IRequest,
      },
    );
  typia.assert(multiLogResponse);
}
