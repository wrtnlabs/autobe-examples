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

export async function test_api_administrator_account_governance_view(
  connection: api.IConnection,
): Promise<void> {
  const requesterConnection: api.IConnection = { host: connection.host };
  const requesterAuthorized = await authorize_administrator_join(
    requesterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(requesterAuthorized);
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuthorized = await authorize_administrator_join(
    targetConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(targetAuthorized);
  const output =
    await api.functional.mallPlatform.administrator.administrators.at(
      requesterConnection,
      {
        administratorId: targetAuthorized.id,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "administrator id should match target",
    output.id,
    targetAuthorized.id,
  );
  TestValidator.equals(
    "administrator email should match target",
    output.email,
    targetAuthorized.email,
  );
  TestValidator.equals(
    "administrator grade should match target",
    output.grade,
    targetAuthorized.grade,
  );
  TestValidator.equals(
    "administrator status should match target",
    output.status,
    targetAuthorized.status,
  );
  TestValidator.equals(
    "administrator createdAt should match target",
    output.createdAt,
    targetAuthorized.createdAt,
  );
  TestValidator.equals(
    "administrator updatedAt should match target",
    output.updatedAt,
    targetAuthorized.updatedAt,
  );
  TestValidator.equals(
    "administrator deletedAt should match target",
    output.deletedAt,
    targetAuthorized.deletedAt,
  );
  TestValidator.notEquals(
    "should not leak requester record",
    output.id,
    requesterAuthorized.id,
  );
}
