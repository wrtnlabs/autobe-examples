import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_specification_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Administrator sale specification retrieval tests
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Scenario 1: Successful retrieval with valid specId
  const validSpecId = typia.random<string & tags.Format<"uuid">>();
  const saleSpecification =
    await api.functional.shoppingMall.administrator.sale_specifications.at(
      adminConnection,
      { specId: validSpecId },
    );
  typia.assert(saleSpecification);
  // 3. Scenario 2: Retrieval attempt with non-existing specId
  let invalidSpecId = typia.random<string & tags.Format<"uuid">>();
  // Ensure invalidSpecId differs from validSpecId
  if (invalidSpecId === validSpecId) {
    invalidSpecId += "00000000-0000-0000-0000-000000000000";
  }
  await TestValidator.httpError(
    "non-existent specId returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sale_specifications.at(
        adminConnection,
        {
          specId: invalidSpecId,
        },
      );
    },
  );
}
