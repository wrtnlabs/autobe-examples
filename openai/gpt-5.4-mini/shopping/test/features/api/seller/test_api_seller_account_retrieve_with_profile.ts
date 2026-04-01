import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_account_retrieve_with_profile(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const seller = await api.functional.mallPlatform.administrator.sellers.at(
    adminConnection,
    {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(seller);
  TestValidator.predicate("seller id is present", seller.id.length > 0);
  TestValidator.predicate("seller email is present", seller.email.length > 0);
  TestValidator.predicate("seller status is present", seller.status.length > 0);
  TestValidator.equals(
    "rejection reason is null or stored value",
    seller.rejectionReason,
    seller.rejectionReason ?? null,
  );
  TestValidator.predicate("createdAt is present", seller.createdAt.length > 0);
  TestValidator.predicate("updatedAt is present", seller.updatedAt.length > 0);
  TestValidator.equals(
    "deletedAt is null or stored value",
    seller.deletedAt,
    seller.deletedAt ?? null,
  );
}
