import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserAuditLogDetail";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityUserAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLog";
import type { IRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLogDetail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_audit_log_details_query_by_key_value(
  connection: api.IConnection,
): Promise<void> {
  // We assume the connection is already authenticated as platform admin
  // We cannot create data because the create endpoints are not exposed in the API
  // We'll query with a basic filter and validate response structure
  // Use a minimal filter that may match existing data
  const queryParams: IRedditCommunityUserAuditLogDetail.IRequest = {
    key: "ip_address",
    value: "192.168.1.", // This may match some existing IP addresses
  };
  // Query the audit log details endpoint
  const result = await api.functional.redditCommunity.audit_log_details.index(
    connection,
    { body: queryParams },
  );
  typia.assert(result);
  // Validate response structure matches IPageIRedditCommunityUserAuditLogDetail.ISummary
  TestValidator.predicate(
    "response has pagination",
    result.pagination !== undefined,
  );
  TestValidator.predicate("response has data", result.data !== undefined);
  TestValidator.equals(
    "pagination current is positive",
    result.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is between 1-100",
    result.pagination.limit >= 1 && result.pagination.limit <= 100,
    true,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate data structure
  result.data.forEach((detail) => {
    // Validate key-value pair structure
    TestValidator.equals(
      "detail key is string",
      typeof detail.key === "string",
      true,
    );
    TestValidator.predicate("detail key is not empty", detail.key.length > 0);
    TestValidator.equals(
      "detail value is string",
      typeof detail.value === "string",
      true,
    );
    TestValidator.predicate(
      "detail value is not empty",
      detail.value.length > 0,
    );
    // Validate auditLogId structure
    TestValidator.equals(
      "auditLogId.id is UUID",
      typia.is<string & tags.Format<"uuid">>(detail.auditLogId.id),
      true,
    );
    TestValidator.equals(
      "auditLogId.action is string",
      typeof detail.auditLogId.action === "string",
      true,
    );
    TestValidator.equals(
      "auditLogId.ip_address is string",
      typeof detail.auditLogId.ip_address === "string",
      true,
    );
    TestValidator.equals(
      "auditLogId.user_agent is string or null",
      detail.auditLogId.user_agent === null ||
        typeof detail.auditLogId.user_agent === "string",
      true,
    );
    TestValidator.equals(
      "auditLogId.session_id is UUID or null",
      detail.auditLogId.session_id === null ||
        typia.is<string & tags.Format<"uuid">>(detail.auditLogId.session_id),
      true,
    );
    TestValidator.equals(
      "auditLogId.created_at is ISO format",
      typia.is<string & tags.Format<"date-time">>(detail.auditLogId.created_at),
      true,
    );
    // Validate actor summaries are optional and of correct structure
    TestValidator.equals(
      "auditLogId.member is optional",
      detail.auditLogId.member === null ||
        detail.auditLogId.member === undefined ||
        (typia.is<string & tags.Format<"uuid">>(detail.auditLogId.member.id) &&
          typeof detail.auditLogId.member.display_name === "string" &&
          (detail.auditLogId.member.avatar_url === null ||
            detail.auditLogId.member.avatar_url === undefined ||
            typeof detail.auditLogId.member.avatar_url === "string") &&
          (detail.auditLogId.member.bio === null ||
            detail.auditLogId.member.bio === undefined ||
            typeof detail.auditLogId.member.bio === "string") &&
          typia.is<string & tags.Format<"date-time">>(
            detail.auditLogId.member.created_at,
          )),
      true,
    );
    TestValidator.equals(
      "auditLogId.owner is optional",
      detail.auditLogId.owner === null ||
        detail.auditLogId.owner === undefined ||
        (typia.is<string & tags.Format<"uuid">>(detail.auditLogId.owner.id) &&
          typeof detail.auditLogId.owner.display_name === "string" &&
          (detail.auditLogId.owner.avatar_url === null ||
            detail.auditLogId.owner.avatar_url === undefined ||
            typeof detail.auditLogId.owner.avatar_url === "string") &&
          (detail.auditLogId.owner.bio === null ||
            detail.auditLogId.owner.bio === undefined ||
            typeof detail.auditLogId.owner.bio === "string")),
      true,
    );
    TestValidator.equals(
      "auditLogId.moderator is optional",
      detail.auditLogId.moderator === null ||
        detail.auditLogId.moderator === undefined ||
        (typia.is<string & tags.Format<"uuid">>(
          detail.auditLogId.moderator.id,
        ) &&
          typeof detail.auditLogId.moderator.display_name === "string" &&
          (detail.auditLogId.moderator.avatar_url === null ||
            detail.auditLogId.moderator.avatar_url === undefined ||
            typeof detail.auditLogId.moderator.avatar_url === "string") &&
          (detail.auditLogId.moderator.bio === null ||
            detail.auditLogId.moderator.bio === undefined ||
            typeof detail.auditLogId.moderator.bio === "string") &&
          typia.is<string & tags.Format<"date-time">>(
            detail.auditLogId.moderator.created_at,
          )),
      true,
    );
    TestValidator.equals(
      "auditLogId.admin is optional",
      detail.auditLogId.admin === null ||
        detail.auditLogId.admin === undefined ||
        (typia.is<string & tags.Format<"uuid">>(detail.auditLogId.admin.id) &&
          typeof detail.auditLogId.admin.display_name === "string" &&
          (detail.auditLogId.admin.bio === null ||
            typeof detail.auditLogId.admin.bio === "string") &&
          (detail.auditLogId.admin.avatar_url === null ||
            typeof detail.auditLogId.admin.avatar_url === "string") &&
          typeof detail.auditLogId.admin.karma === "number"),
      true,
    );
  });
}
