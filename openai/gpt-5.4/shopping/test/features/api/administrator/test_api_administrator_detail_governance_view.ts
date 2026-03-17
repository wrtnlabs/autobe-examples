import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_detail_governance_view(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const joined = await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    },
  });
  typia.assert(joined);
  const detail = await api.functional.shoppingMall.administrators.at(
    administratorConnection,
    {
      administratorId: joined.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("administrator id matches", detail.id, joined.id);
  TestValidator.equals(
    "administrator email matches",
    detail.email,
    joined.email,
  );
  TestValidator.equals(
    "administrator active matches",
    detail.active,
    joined.active,
  );
  TestValidator.equals(
    "administrator banned matches",
    detail.banned,
    joined.banned,
  );
  TestValidator.equals(
    "administrator created_at matches",
    detail.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "administrator updated_at matches",
    detail.updated_at,
    joined.updated_at,
  );
  TestValidator.equals(
    "administrator deleted_at matches",
    detail.deleted_at,
    joined.deleted_at,
  );
}
