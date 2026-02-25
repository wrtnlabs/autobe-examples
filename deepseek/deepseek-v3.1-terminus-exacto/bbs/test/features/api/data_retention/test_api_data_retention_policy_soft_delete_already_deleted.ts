import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_data_retention_policies_create } from "../../../generate/generate_random_discussion_board_admin_data_retention_policies_create";
import { prepare_random_discussion_board_data_retention_policy } from "../../../prepare/prepare_random_discussion_board_data_retention_policy";

export async function test_api_data_retention_policy_soft_delete_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin12345",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create initial data retention policy
  const policyBody = {
    policy_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    retention_period_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    retention_action: typia.random<"delete" | "archive" | "anonymize">(),
    compliance_standard: RandomGenerator.pick(["GDPR", "CCPA", null]),
    is_active: true,
  } satisfies IDiscussionBoardDataRetentionPolicy.ICreate;
  const createdPolicy =
    await api.functional.discussionBoard.admin.data_retention_policies.create(
      adminConnection,
      { body: policyBody },
    );
  typia.assert(createdPolicy);
  TestValidator.predicate(
    "policy initially active",
    createdPolicy.is_active === true,
  );
  TestValidator.equals(
    "deleted_at initially null",
    createdPolicy.deleted_at,
    null,
  );
  // 3. First soft delete
  const firstDelete =
    await api.functional.discussionBoard.admin.data_retention_policies.erase(
      adminConnection,
      { policyId: createdPolicy.id },
    );
  typia.assert(firstDelete);
  TestValidator.predicate(
    "policy marked inactive after first delete",
    firstDelete.is_active === false,
  );
  TestValidator.predicate(
    "deleted_at timestamp set",
    firstDelete.deleted_at !== null,
  );
  // 4. Attempt second soft delete on already deleted policy
  const secondDelete =
    await api.functional.discussionBoard.admin.data_retention_policies.erase(
      adminConnection,
      { policyId: createdPolicy.id },
    );
  typia.assert(secondDelete);
  // 5. Validate idempotency behavior
  TestValidator.notEquals("policy removed from system", secondDelete, null);
  TestValidator.predicate(
    "policy remains inactive after second delete",
    secondDelete.is_active === false,
  );
  TestValidator.equals(
    "deleted_at timestamp unchanged",
    firstDelete.deleted_at,
    secondDelete.deleted_at,
  );
  TestValidator.equals("policy ID unchanged", firstDelete.id, secondDelete.id);
  TestValidator.equals(
    "policy name unchanged",
    firstDelete.policy_name,
    secondDelete.policy_name,
  );
}
