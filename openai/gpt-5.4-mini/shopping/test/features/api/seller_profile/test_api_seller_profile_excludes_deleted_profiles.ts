import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_excludes_deleted_profiles(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request = {
    search: RandomGenerator.alphabets(5),
    sort: "newest",
    page: 1,
    limit: 20,
  } satisfies IMallPlatformSellerProfile.IRequest;
  const output =
    await api.functional.mallPlatform.administrator.sellerProfiles.index(
      adminConnection,
      { body: request },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page should be valid",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be valid",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination record count should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  for (const profile of output.data) {
    TestValidator.equals(
      "seller profile should be active",
      profile.deletedAt,
      null,
    );
    TestValidator.predicate(
      "seller profile should have a seller account",
      profile.sellerAccount.id.length > 0,
    );
    TestValidator.equals(
      "seller account should not be deleted",
      profile.sellerAccount.deletedAt,
      null,
    );
  }
}
