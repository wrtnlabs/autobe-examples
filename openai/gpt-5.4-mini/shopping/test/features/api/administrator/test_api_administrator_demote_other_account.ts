import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_demote_other_account(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test super administrator demotion of another administrator account.
   *
   * Validates that one authenticated administrator can demote a different target
   * administrator through the governance endpoint and that the returned account
   * record preserves immutable identity and lifecycle fields while reflecting a
   * lower privilege grade.
   *
   * 1. Authenticate two distinct administrator accounts.
   * 2. Use the first account as the acting super administrator context.
   * 3. Demote the second account and capture the updated record.
   * 4. Validate that identity and lifecycle fields are preserved and that the
   *    privilege grade changes to a lower level.
   */
  const actorConnection: api.IConnection = { host: connection.host };
  const targetConnection: api.IConnection = { host: connection.host };
  const actorEmail = `${RandomGenerator.alphabets(10)}@test.com`;
  const targetEmail = `${RandomGenerator.alphabets(10)}@test.com`;
  const password = "1234";
  const actor = await authorize_administrator_join(actorConnection, {
    body: {
      email: actorEmail,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(actor);
  const target = await authorize_administrator_join(targetConnection, {
    body: {
      email: targetEmail,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(target);
  TestValidator.notEquals(
    "administrator ids must be distinct",
    actor.id,
    target.id,
  );
  const expectedBefore: IMallPlatformAdministrator = {
    id: target.id,
    email: target.email,
    grade: target.grade,
    status: target.status,
    createdAt: target.createdAt,
    updatedAt: target.updatedAt,
    deletedAt: target.deletedAt,
  };
  const demoted =
    await api.functional.mallPlatform.administrator.administrators.demote(
      actorConnection,
      {
        administratorId: target.id,
      },
    );
  typia.assert(demoted);
  TestValidator.equals(
    "administrator id preserved",
    demoted.id,
    expectedBefore.id,
  );
  TestValidator.equals(
    "administrator email preserved",
    demoted.email,
    expectedBefore.email,
  );
  TestValidator.equals(
    "administrator status preserved",
    demoted.status,
    expectedBefore.status,
  );
  TestValidator.equals(
    "administrator createdAt preserved",
    demoted.createdAt,
    expectedBefore.createdAt,
  );
  TestValidator.equals(
    "administrator deletedAt preserved",
    demoted.deletedAt,
    expectedBefore.deletedAt,
  );
  TestValidator.notEquals(
    "administrator grade changed after demotion",
    demoted.grade,
    expectedBefore.grade,
  );
  TestValidator.predicate(
    "administrator remains active after demotion",
    demoted.status.toLowerCase() === "active",
  );
  TestValidator.predicate(
    "administrator is downgraded to a regular role",
    demoted.grade.toLowerCase().includes("regular"),
  );
}
