import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_registration_duplicate_pending_business_number(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique business registration number to test duplicate detection
  const sharedBusinessRegNumber = RandomGenerator.alphaNumeric(12);
  // 1. Authenticate as first seller
  const firstSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(firstSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. First seller submits registration with unique business registration number
  const firstRegistration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      firstSellerConnection,
      {
        body: {
          businessRegistrationNumber: sharedBusinessRegNumber,
          taxIdentificationNumber: RandomGenerator.alphaNumeric(9),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies Partial<IEcommerceMallSellerRegistration.ICreate>,
      },
    );
  typia.assert(firstRegistration);
  // 3. Authenticate as second seller (different account)
  const secondSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(secondSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 4. Second seller attempts registration with same business registration number
  // Should fail with 409 Conflict due to duplicate pending application
  await TestValidator.httpError(
    "duplicate pending business registration number should return 409",
    409,
    async () => {
      await generate_random_ecommerce_mall_seller_registrations_create(
        secondSellerConnection,
        {
          body: {
            businessRegistrationNumber: sharedBusinessRegNumber,
            taxIdentificationNumber: RandomGenerator.alphaNumeric(9),
            businessName: RandomGenerator.name(),
            businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies Partial<IEcommerceMallSellerRegistration.ICreate>,
        },
      );
    },
  );
}
