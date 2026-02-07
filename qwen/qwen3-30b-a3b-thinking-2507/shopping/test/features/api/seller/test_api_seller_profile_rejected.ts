import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerProfile = await api.functional.ecommerce.sellers.profile.at(
    connection,
    {
      sellerId: sellerId,
    },
  );
  typia.assert(sellerProfile);
  TestValidator.equals(
    "approval_status should be 'rejected'",
    sellerProfile.approval_status,
    "rejected",
  );
}
