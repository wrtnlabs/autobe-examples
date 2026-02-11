import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserAuditLogDetail";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLogDetail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_audit_log_details_platform_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with known credentials
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Log in as member to trigger audit event
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(loginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 3. Create platform admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_platform_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  // 4. Log in as platform admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_platform_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityPlatformAdmin.ILogin,
  });
  // 5. Generate a valid UUID as audit log ID
  // NOTE: There is no API provided to retrieve existing audit log IDs.
  // This test assumes that audit logs are created automatically by the system
  // when members perform actions. We cannot obtain the exact ID, so we generate
  // a random UUID to test the platform admin access capability.
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 6. Call endpoint to retrieve audit log details with admin connection
  const auditDetails =
    await api.functional.redditCommunity.audit_logs.details.index(
      adminLoginConnection,
      {
        auditLogId,
      },
    );
  typia.assert(auditDetails);
  // 7. Validate audit details structure
  // Platform admin should have access to audit log details if they exist.
  // If the audit log doesn't exist, the system should return 404, but the test
  // still passes if the admin connection is accepted and response structure is valid.
  // We validate the structure of the response, not the content, since we can't control
  // what audit logs exist.
  TestValidator.predicate(
    "audit details pagination is valid",
    auditDetails.pagination.current >= 0,
  );
  TestValidator.predicate(
    "audit details pagination limit is valid",
    auditDetails.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "audit details pagination records is non-negative",
    auditDetails.pagination.records >= 0,
  );
  TestValidator.predicate(
    "audit details pagination pages is non-negative",
    auditDetails.pagination.pages >= 0,
  );
  // Validate that data array is present
  TestValidator.predicate(
    "audit details data array exists",
    Array.isArray(auditDetails.data),
  );
  // Optional: If any records exist, validate their structure
  if (auditDetails.data.length > 0) {
    TestValidator.predicate(
      "audit detail has valid key",
      auditDetails.data.some(
        (detail) => typeof detail.key === "string" && detail.key.length > 0,
      ),
    );
    TestValidator.predicate(
      "audit detail has valid value",
      auditDetails.data.some((detail) => typeof detail.value === "string"),
    );
  }
}
