import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_detail_super_admin_oversight(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministratorJoin = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdministratorJoin);
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const administratorJoin = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administratorJoin);
  const detail = await api.functional.shoppingMall.administrators.at(
    superAdministratorConnection,
    {
      administratorId: administratorJoin.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals(
    "detail id matches created administrator",
    detail.id,
    administratorJoin.id,
  );
  TestValidator.equals(
    "detail email matches created administrator",
    detail.email,
    administratorJoin.email,
  );
  TestValidator.equals(
    "detail active matches created administrator state",
    detail.active,
    administratorJoin.active,
  );
  TestValidator.equals(
    "detail banned matches created administrator state",
    detail.banned,
    administratorJoin.banned,
  );
  TestValidator.equals(
    "detail created_at matches created administrator state",
    detail.created_at,
    administratorJoin.created_at,
  );
  TestValidator.equals(
    "detail updated_at matches created administrator state",
    detail.updated_at,
    administratorJoin.updated_at,
  );
  TestValidator.equals(
    "detail deleted_at matches created administrator state",
    detail.deleted_at,
    administratorJoin.deleted_at,
  );
  const detailAgain = await api.functional.shoppingMall.administrators.at(
    superAdministratorConnection,
    {
      administratorId: administratorJoin.id,
    },
  );
  typia.assert(detailAgain);
  TestValidator.equals(
    "repeated oversight retrieval is read-only",
    detailAgain,
    detail,
  );
}
