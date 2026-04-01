import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sellerProfileId = typia.random<string & tags.Format<"uuid">>();
  const output: IMallPlatformSellerProfile =
    await api.functional.mallPlatform.administrator.sellerProfiles.at(
      adminConnection,
      {
        sellerProfileId,
      },
    );
  typia.assert(output);
  TestValidator.equals("seller profile id", output.id, sellerProfileId);
  TestValidator.predicate(
    "seller account summary exists",
    output.sellerAccount !== null && output.sellerAccount !== undefined,
  );
  TestValidator.predicate("shop name is present", output.shopName.length > 0);
  TestValidator.predicate(
    "shop description is present",
    output.shopDescription.length > 0,
  );
  TestValidator.predicate("created at is present", output.createdAt.length > 0);
  TestValidator.predicate("updated at is present", output.updatedAt.length > 0);
  TestValidator.predicate(
    "deleted at is null or timestamp",
    output.deletedAt === null || output.deletedAt.length > 0,
  );
  await TestValidator.error("seller profile not found", async () => {
    await api.functional.mallPlatform.administrator.sellerProfiles.at(
      adminConnection,
      {
        sellerProfileId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
