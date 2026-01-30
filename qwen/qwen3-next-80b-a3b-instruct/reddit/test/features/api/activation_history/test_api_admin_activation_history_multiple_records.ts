import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsUserActivation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserActivation";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_activation_history_multiple_records(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  // Step 2: Create a member account and get user_id
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  const userId = member.id;
  // Step 3: Simulate multiple activation attempts (join operations) for the same user
  // We'll perform three activations to create multiple records in activation history
  const activationRecords: ICommunityBbsUserActivation[] = [];
  // First activation attempt
  const firstJoin = await authorize_member_join(memberConnection, {
    body: {
      email: member.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(firstJoin);
  // Second activation attempt with different password
  const secondJoin = await authorize_member_join(memberConnection, {
    body: {
      email: member.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(secondJoin);
  // Third activation attempt
  const thirdJoin = await authorize_member_join(memberConnection, {
    body: {
      email: member.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(thirdJoin);
  // Step 4: Fetch activation history using admin connection
  const activationHistory =
    await api.functional.communityBbs.admin.users.activation_history.at(
      adminConnection,
      {
        userId: userId,
      },
    );
  // Fix: The endpoint likely returns an array, so we assert it as an array
  const historyArray = typia.assert<ICommunityBbsUserActivation[]>(activationHistory);
  // Step 5: Validate that we have exactly 3 activation records
  TestValidator.equals(
    "activation history should contain 3 records",
    historyArray.length,
    3,
  );
  // Step 6: Validate ordering by created_at descending (latest first)
  TestValidator.predicate(
    "records are ordered by created_at descending",
    () => {
      for (let i = 0; i < historyArray.length - 1; i++) {
        const current = new Date(historyArray[i].created_at);
        const next = new Date(historyArray[i + 1].created_at);
        if (current <= next) return false; // Not descending
      }
      return true;
    },
  );
  // Step 7: Validate all records have required properties from ICommunityBbsUserActivation
  for (const record of historyArray) {
    TestValidator.predicate(
      "record has valid user_id",
      () => record.user_id === userId,
    );
    TestValidator.predicate("record has valid status", () =>
      ["pending", "active", "expired"].includes(record.status),
    );
    TestValidator.predicate("record has created_at", () => !!record.created_at);
    TestValidator.predicate("record has correct created_at format", () => {
      const date = new Date(record.created_at);
      return !isNaN(date.getTime());
    });
    TestValidator.predicate(
      "record has activation_code",
      () => record.activation_code !== undefined,
    );
    TestValidator.predicate(
      "record has metadata",
      () => record.metadata !== undefined,
    );
    TestValidator.predicate(
      "record has ip_address",
      () => record.ip_address !== undefined,
    );
  }
  // Step 8: Validate that activation records are complete and match expected structure
  // The activation history should include all three attempts we created
  TestValidator.predicate("all activation records have id", () => {
    return historyArray.every((r) => r.id !== undefined);
  });
}