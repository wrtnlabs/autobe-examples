import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_profile_retrieval_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Get seller profile
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const response = await api.functional.ecommerce.admin.sellers.at(
    adminConnection,
    {
      sellerId,
    },
  );
  typia.assert(response);
  // 3. Validate
  TestValidator.equals(
    "seller status is approved",
    response.status,
    "approved",
  );
  TestValidator.predicate(
    "business name exists",
    response.name !== null && response.name !== undefined,
  );
  TestValidator.predicate(
    "description exists",
    response.description !== null && response.description !== undefined,
  );
  TestValidator.equals("created_at format", response.created_at.length, 24);
  TestValidator.equals("updated_at format", response.updated_at.length, 24);
}
