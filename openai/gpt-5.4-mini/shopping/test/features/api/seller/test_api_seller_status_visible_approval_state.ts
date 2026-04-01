import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_status_visible_approval_state(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const firstStatus =
    await api.functional.mallPlatform.seller.status.at(sellerConnection);
  typia.assert(firstStatus);
  const secondStatus =
    await api.functional.mallPlatform.seller.status.at(sellerConnection);
  typia.assert(secondStatus);
  TestValidator.equals(
    "seller approval status remains stable",
    firstStatus.approvalStatus,
    secondStatus.approvalStatus,
  );
  TestValidator.equals(
    "seller rejection reason remains stable",
    firstStatus.rejectionReason,
    secondStatus.rejectionReason,
  );
  TestValidator.equals(
    "seller account id remains stable",
    firstStatus.id,
    secondStatus.id,
  );
  TestValidator.equals(
    "seller email remains stable",
    firstStatus.email,
    secondStatus.email,
  );
  TestValidator.equals(
    "seller createdAt remains stable",
    firstStatus.createdAt,
    secondStatus.createdAt,
  );
  TestValidator.equals(
    "seller updatedAt remains stable",
    firstStatus.updatedAt,
    secondStatus.updatedAt,
  );
  TestValidator.equals(
    "seller deletedAt remains stable",
    firstStatus.deletedAt,
    secondStatus.deletedAt,
  );
}
