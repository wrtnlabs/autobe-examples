import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_detail_read_success(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  const authorized = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(authorized);
  const baseline = {
    id: authorized.id,
    email: authorized.email,
    active: authorized.active,
    created_at: authorized.created_at,
    updated_at: authorized.updated_at,
    deleted_at: authorized.deleted_at,
  } satisfies IShoppingMallSuperAdministrator;
  const detail = await api.functional.shoppingMall.superAdministrators.at(
    superAdministratorConnection,
    {
      superAdministratorId: authorized.id,
    },
  );
  typia.assert(detail);
  typia.assertEquals<IShoppingMallSuperAdministrator>(detail);
  TestValidator.equals(
    "detail id matches requested id",
    detail.id,
    authorized.id,
  );
  TestValidator.equals(
    "detail email matches persisted account",
    detail.email,
    baseline.email,
  );
  TestValidator.equals(
    "detail active matches persisted account",
    detail.active,
    baseline.active,
  );
  TestValidator.equals(
    "detail created_at matches persisted account",
    detail.created_at,
    baseline.created_at,
  );
  TestValidator.equals(
    "detail updated_at matches persisted account",
    detail.updated_at,
    baseline.updated_at,
  );
  TestValidator.equals(
    "detail deleted_at matches persisted account",
    detail.deleted_at,
    baseline.deleted_at,
  );
}
