import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_accounts_moderation_states_visible(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.sellerAccounts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "+createdAt",
        } satisfies IMallPlatformSellerAccount.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page is non-negative",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  for (const seller of output.data) {
    TestValidator.predicate("seller id exists", seller.id.length > 0);
    TestValidator.predicate("seller email exists", seller.email.length > 0);
    TestValidator.predicate(
      "seller approval status exists",
      seller.approvalStatus.length > 0,
    );
    TestValidator.predicate(
      "seller createdAt exists",
      seller.createdAt.length > 0,
    );
    TestValidator.predicate(
      "seller updatedAt exists",
      seller.updatedAt.length > 0,
    );
    if (seller.approvalStatus === "rejected") {
      TestValidator.predicate(
        "rejected sellers expose rejection metadata",
        seller.rejectionReason !== null,
      );
    }
    if (seller.suspendedAt !== null) {
      TestValidator.predicate(
        "suspended sellers retain suspension timestamp",
        seller.suspendedAt.length > 0,
      );
    }
    if (seller.deletedAt !== null) {
      TestValidator.predicate(
        "deleted sellers retain deletion timestamp",
        seller.deletedAt.length > 0,
      );
    }
  }
}
