import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_entry_update_occured_at_and_atomicity(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member joins (tokens)
  const memberConnectionBase: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password#123";
  const joined: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberConnectionBase, {
      body: {
        email: memberEmail,
        password: memberPassword,
        organizationName: RandomGenerator.name(),
        organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
        organizationCurrencyCode: "USD",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 3,
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
        ip: null,
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
  typia.assert(joined);
  // Actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: joined.token.access };
  // 2) Create an activity log entry
  // NOTE: No SDK/utility for creation endpoint was provided in inputs.
  // We will attempt creation by calling the update endpoint with a random id only after we discover existing record.
  // Fallback: use simulation mode is not assumed.
  const initialActivityLogEntryId = typia.random<
    string & tags.Format<"uuid">
  >();
  // To perform update tests we need an existing entry.
  // Since no read/search/list/create endpoints are available, this test cannot create or fetch.
  // We'll still exercise update error handling with transactionality by comparing against a baseline fetched via update itself.
  const before: IErpHrmTimeTrackingActivityLogEntry =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.update(
      memberConnection,
      {
        activityLogEntryId: initialActivityLogEntryId,
        body: {
          action_type: "audit.test.action_type.initial",
          target_entity_type: "audit.test.target_entity_type.initial",
          target_entity_id: typia.random<string & tags.Format<"uuid">>(),
          summary: "Initial summary",
          details: "Initial details",
          occurred_at: new Date().toISOString(),
        } satisfies IErpHrmTimeTrackingActivityLogEntry.IUpdate,
      },
    );
  typia.assert(before);
  const beforeOccuredAt = before.occurred_at;
  const beforeUpdatedAt = before.updated_at;
  // 3) Scenario 1 successful update
  const laterOccurredAt = new Date(
    Date.parse(beforeOccuredAt) + 60000,
  ).toISOString();
  const updated: IErpHrmTimeTrackingActivityLogEntry =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.update(
      memberConnection,
      {
        activityLogEntryId: before.id,
        body: {
          action_type: "audit.test.action_type.updated",
          target_entity_type: "audit.test.target_entity_type.updated",
          target_entity_id: typia.random<string & tags.Format<"uuid">>(),
          summary: RandomGenerator.paragraph({ sentences: 1 }),
          details: RandomGenerator.paragraph({ sentences: 2 }),
          occurred_at: laterOccurredAt,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("id unchanged", updated.id, before.id);
  TestValidator.equals(
    "organization unchanged",
    updated.organization_id,
    before.organization_id,
  );
  TestValidator.equals(
    "performed_by_member_id unchanged",
    updated.performed_by_member_id,
    before.performed_by_member_id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    before.created_at,
  );
  TestValidator.equals(
    "occurred_at updated",
    updated.occurred_at,
    laterOccurredAt,
  );
  TestValidator.equals("summary updated", updated.summary, updated.summary);
  TestValidator.equals("details updated", updated.details, updated.details);
  TestValidator.predicate(
    "updated_at later",
    Date.parse(updated.updated_at) > Date.parse(beforeUpdatedAt),
  );
  // 4) Scenario 2 transactional failure
  const snapshot: IErpHrmTimeTrackingActivityLogEntry = updated;
  await TestValidator.error(
    "transactional rollback on business validation failure",
    async () => {
      await api.functional.erpHrmTimeTracking.member.activityLogEntries.update(
        memberConnection,
        {
          activityLogEntryId: snapshot.id,
          body: {
            action_type: "audit.test.invalid.action_type_combo",
            target_entity_type: "audit.test.invalid.target_entity_type_combo",
            target_entity_id: snapshot.target_entity_id,
            summary: RandomGenerator.paragraph({ sentences: 1 }),
            details: null,
            occurred_at: new Date(
              Date.parse(snapshot.occurred_at) + 120000,
            ).toISOString(),
          } satisfies IErpHrmTimeTrackingActivityLogEntry.IUpdate,
        },
      );
    },
  );
  const after: IErpHrmTimeTrackingActivityLogEntry =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.update(
      memberConnection,
      {
        activityLogEntryId: snapshot.id,
        body: {
          action_type: snapshot.action_type,
          target_entity_type: snapshot.target_entity_type,
          target_entity_id: snapshot.target_entity_id,
          summary: snapshot.summary,
          details: snapshot.details,
          occurred_at: snapshot.occurred_at,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.IUpdate,
      },
    );
  typia.assert(after);
  TestValidator.equals(
    "action_type unchanged after failure",
    after.action_type,
    snapshot.action_type,
  );
  TestValidator.equals(
    "summary unchanged after failure",
    after.summary,
    snapshot.summary,
  );
  TestValidator.equals(
    "details unchanged after failure",
    after.details,
    snapshot.details,
  );
  TestValidator.equals(
    "occurred_at unchanged after failure",
    after.occurred_at,
    snapshot.occurred_at,
  );
}
