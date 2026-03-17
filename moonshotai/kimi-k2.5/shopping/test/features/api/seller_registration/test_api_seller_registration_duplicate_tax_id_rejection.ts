import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_registration_duplicate_tax_id_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account for approving first seller
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Create first seller account
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {});
  typia.assert(firstSeller);
  // Step 3: First seller submits registration with specific tax ID
  const taxId = RandomGenerator.alphaNumeric(12);
  const firstRegistration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      firstSellerConnection,
      {
        body: {
          taxIdentificationNumber: taxId,
        },
      },
    );
  typia.assert(firstRegistration);
  // Assert registration has id and approve it by admin
  const registrationWithId = typia.assert<
    IEcommerceMallSellerRegistration & {
      id: string & tags.Format<"uuid">;
    }
  >(firstRegistration);
  await api.functional.ecommerceMall.admin.seller_registrations.update(
    adminConnection,
    {
      registrationId: registrationWithId.id,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerRegistration.IUpdate,
    },
  );
  // Step 4: Create second seller account with different credentials
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSeller = await authorize_seller_join(secondSellerConnection, {});
  typia.assert(secondSeller);
  // Step 5: Second seller attempts duplicate registration with same tax ID - should be rejected
  await TestValidator.error("duplicate tax ID rejection", async () => {
    await generate_random_ecommerce_mall_seller_registrations_create(
      secondSellerConnection,
      {
        body: {
          taxIdentificationNumber: taxId,
        },
      },
    );
  });
}
