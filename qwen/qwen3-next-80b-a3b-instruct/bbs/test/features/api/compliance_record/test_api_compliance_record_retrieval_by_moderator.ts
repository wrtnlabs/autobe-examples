import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IComplianceRecordActionTaken } from "@ORGANIZATION/PROJECT-api/lib/structures/IComplianceRecordActionTaken";
import type { IComplianceRecordStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IComplianceRecordStatus";
import type { IComplianceRecordType } from "@ORGANIZATION/PROJECT-api/lib/structures/IComplianceRecordType";
import type { IDiscussionBoardComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComplianceRecord";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_compliance_record_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and join to become a moderator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: IAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Authenticate as the moderator (admin) to access compliance records
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(moderatorConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAdmin.ILogin,
  });
  // Step 3: Generate a valid compliance record ID for retrieval test
  // We cannot create a record programmatically, so we generate a random UUID
  // This tests the retrieval functionality with a valid record ID format
  const recordId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 4: Retrieve the compliance record using the moderator connection
  const retrievedRecord: IDiscussionBoardComplianceRecord =
    await api.functional.discussionBoard.moderator.audit.compliance_records.at(
      moderatorConnection,
      {
        recordId,
      },
    );
  typia.assert(retrievedRecord);
  // Step 5: Validate core structure of the compliance record
  // Ensure all required fields are present with correct types
  TestValidator.equals(
    "retrieved compliance record has valid UUID ID",
    retrievedRecord.id,
    recordId,
  );
  // Validate record_type is one of the valid enum values
  const validRecordTypes: IComplianceRecordType[] = [
    "USER_REPORT",
    "MODERATOR_ACTION",
    "SYSTEM_TRIGGER",
    "APPEAL",
  ];
  TestValidator.predicate(
    "retrieved compliance record has valid record_type",
    validRecordTypes.includes(retrievedRecord.record_type),
  );
  // Validate status if present
  if (retrievedRecord.status !== undefined) {
    const validStatuses: IComplianceRecordStatus[] = [
      "PENDING_REVIEW",
      "RESOLVED",
      "APPEAL_PENDED",
      "APPEAL_REJECTED",
      "APPEAL_GRANTED",
    ];
    TestValidator.predicate(
      "retrieved compliance record has valid status",
      validStatuses.includes(retrievedRecord.status),
    );
  }
  // Validate action_taken if present
  if (retrievedRecord.action_taken !== undefined) {
    const validActions: IComplianceRecordActionTaken[] = [
      "NONE",
      "WARNING",
      "CONTENT_REMOVAL",
      "ACCOUNT_SUSPENSION",
      "ACCOUNT_BAN",
      "TRUST_SCORE_ADJUSTMENT",
    ];
    TestValidator.predicate(
      "retrieved compliance record has valid action_taken",
      validActions.includes(retrievedRecord.action_taken),
    );
  }
  // Validate timestamp format - typia.assert already validates Format<'date-time'>
  TestValidator.predicate(
    "retrieved compliance record has timestamp",
    retrievedRecord.timestamp !== undefined,
  );
  // Validate ID fields if present
  if (retrievedRecord.action_id !== undefined) {
    TestValidator.predicate(
      "retrieved compliance record action_id is valid UUID",
      typeof retrievedRecord.action_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          retrievedRecord.action_id,
        ),
    );
  }
  if (retrievedRecord.reporter_id !== undefined) {
    TestValidator.predicate(
      "retrieved compliance record reporter_id is valid UUID",
      typeof retrievedRecord.reporter_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          retrievedRecord.reporter_id,
        ),
    );
  }
  if (retrievedRecord.moderator_id !== undefined) {
    TestValidator.predicate(
      "retrieved compliance record moderator_id is valid UUID",
      typeof retrievedRecord.moderator_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          retrievedRecord.moderator_id,
        ),
    );
  }
  if (retrievedRecord.reported_content_id !== undefined) {
    TestValidator.predicate(
      "retrieved compliance record reported_content_id is valid UUID",
      typeof retrievedRecord.reported_content_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          retrievedRecord.reported_content_id,
        ),
    );
  }
  // Optional fields validation
  // Just validate structure
  if (retrievedRecord.related_report_ids !== undefined) {
    TestValidator.predicate(
      "retrieved compliance record related_report_ids is an array",
      Array.isArray(retrievedRecord.related_report_ids),
    );
    if (retrievedRecord.related_report_ids.length > 0) {
      TestValidator.predicate(
        "all related_report_ids are valid UUIDs",
        retrievedRecord.related_report_ids.every(
          (id) =>
            typeof id === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              id,
            ),
        ),
      );
    }
  }
  if (retrievedRecord.evidence_links !== undefined) {
    TestValidator.predicate(
      "retrieved compliance record evidence_links is an array",
      Array.isArray(retrievedRecord.evidence_links),
    );
    if (retrievedRecord.evidence_links.length > 0) {
      TestValidator.predicate(
        "all evidence_links are valid URIs",
        retrievedRecord.evidence_links.every(
          (link) => typeof link === "string" && /^https?:\/\/.+/.test(link),
        ),
      );
    }
  }
  // Confirm unauthorized access fails
  // Create unauthenticated guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized user cannot access compliance record",
    async () => {
      await api.functional.discussionBoard.moderator.audit.compliance_records.at(
        guestConnection,
        {
          recordId,
        },
      );
    },
  );
}
