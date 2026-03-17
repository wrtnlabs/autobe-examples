import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAttachmentAccessLog";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_moderator_attachments_access_create_access_log } from "../../../generate/generate_random_reddit_like_moderator_attachments_access_create_access_log";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_attachment_access_log } from "../../../prepare/prepare_random_reddit_like_attachment_access_log";

export async function test_api_attachment_access_log_privacy_compliant(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test scenario: A moderator queries access logs that include privacy-compliant
   * records where IP address and user agent fields are null. This demonstrates
   * compliance with data privacy regulations while still providing audit trail functionality.
   */
  // Step 1: Create and authenticate moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  typia.assert(moderator);
  // Step 2: Create and authenticate member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member);
  // Step 3: Member uploads a file attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: "https://example.com/test-image.png",
          originalFilename: "test-privacy-compliance.png",
        },
      },
    );
  typia.assert(attachment);
  // Step 4: Create a privacy-compliant access log entry with null IP and user agent
  // This simulates privacy-compliant logging where sensitive data is not collected
  const privacyCompliantLog =
    await generate_random_reddit_like_moderator_attachments_access_create_access_log(
      moderatorConnection,
      {
        body: {
          access_type: "view",
          ip_address: null, // Privacy-compliant: no IP address collected
          user_agent: null, // Privacy-compliant: no user agent collected
          referer: null,
        },
        params: {
          attachmentId: attachment.id,
        },
      },
    );
  typia.assert(privacyCompliantLog);
  // Verify that the created log has null privacy fields
  TestValidator.equals(
    "ip_address should be null for privacy compliance",
    privacyCompliantLog.ipAddress,
    null,
  );
  TestValidator.equals(
    "user_agent should be null for privacy compliance",
    privacyCompliantLog.userAgent,
    null,
  );
  // Step 5: Query access logs as moderator to verify privacy-compliant records are returned
  const accessLogs =
    await api.functional.redditLike.moderator.attachments.access_logs.index(
      moderatorConnection,
      {
        attachmentId: attachment.id,
        body: {
          ipAddress: null, // Filter to find records with null IP
          limit: 10,
        },
      },
    );
  typia.assert(accessLogs);
  // Step 6: Validate that privacy-compliant records are correctly returned
  TestValidator.predicate(
    "access logs should contain at least one record",
    accessLogs.data.length > 0,
  );
  // Find the privacy-compliant log entry in the results
  const privacyCompliantEntry = accessLogs.data.find(
    (log) => log.id === privacyCompliantLog.id,
  );
  TestValidator.predicate(
    "privacy-compliant entry should exist in results",
    privacyCompliantEntry !== undefined,
  );
  if (privacyCompliantEntry) {
    // Verify that the returned entry has null values for privacy-sensitive fields
    TestValidator.equals(
      "returned log ipAddress should be null",
      privacyCompliantEntry.ipAddress,
      null,
    );
    TestValidator.equals(
      "returned log userAgent should be null",
      privacyCompliantEntry.userAgent,
      null,
    );
    // Verify access type matches
    TestValidator.equals(
      "returned log accessType should match",
      privacyCompliantEntry.accessType,
      "view",
    );
  }
  // Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination current page should be valid",
    accessLogs.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination total records should be at least 1",
    accessLogs.pagination.records >= 1,
  );
}
