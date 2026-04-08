import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

/**
 * Test customer multiple address creation support feature.
 *
 * Validates the complete multiple address workflow including member authentication, creating several distinct shipping addresses, and verifying each address maintains independent data with unique identifiers and timestamps. Ensures the system supports unlimited addresses per customer without imposed limits.
 *
 * Special attention is given to verifying that each address has a unique UUID, correct customer profile association, distinct recipient information, and independent timestamp tracking. The test creates multiple addresses representing different delivery locations (home, work, family) to simulate real-world usage patterns.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Creates first address (home) with recipient name and street address.
 * 3. Creates second address (work) with different recipient and location details.
 * 4. Creates third address (family) with another unique set of address data.
 * 5. Creates additional addresses to verify no system limit exists.
 * 6. Validates each address has unique id, correct profile association, and independent timestamps.
 */
export async function test_api_customer_address_multiple_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Create first address (home)
  const homeAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: "John Home",
          street_address: "123 Home Street, Apt 1A",
          city: "Home City",
          is_default: true,
        },
      },
    );
  typia.assert(homeAddress);
  // 3. Create second address (work)
  const workAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: "John Work",
          street_address: "456 Business Avenue, Suite 500",
          city: "Work City",
          is_default: false,
        },
      },
    );
  typia.assert(workAddress);
  // 4. Create third address (family)
  const familyAddress =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: "Jane Family",
          street_address: "789 Family Lane, Unit 2B",
          city: "Family Town",
          is_default: false,
        },
      },
    );
  typia.assert(familyAddress);
  // 5. Create additional addresses to verify no system limit
  const extraAddresses = await ArrayUtil.asyncRepeat(2, async (index) => {
    const extraAddress =
      await generate_random_shopping_mall_member_addresses_create(
        memberConnection,
        {
          body: {
            recipient_name: `Extra Recipient ${index + 1}`,
            street_address: `${100 + index} Extra Boulevard`,
            city: `Extra City ${index + 1}`,
            is_default: false,
          },
        },
      );
    typia.assert(extraAddress);
    return extraAddress;
  });
  // 6. Validate all addresses have unique IDs
  const allAddresses = [
    homeAddress,
    workAddress,
    familyAddress,
    ...extraAddresses,
  ];
  const addressIds = allAddresses.map((addr) => addr.id);
  const uniqueIds = new Set(addressIds);
  TestValidator.equals(
    "all addresses have unique IDs",
    uniqueIds.size,
    allAddresses.length,
  );
  // 7. Validate each address has customer profile association
  for (const address of allAddresses) {
    TestValidator.predicate(
      "address has customer profile",
      address.customerProfile !== null,
    );
  }
  // 8. Validate each address has independent timestamps
  for (const address of allAddresses) {
    TestValidator.predicate(
      "created_at is valid date-time",
      address.created_at !== null && address.created_at.length > 0,
    );
    TestValidator.predicate(
      "updated_at is valid date-time",
      address.updated_at !== null && address.updated_at.length > 0,
    );
    TestValidator.predicate(
      "deleted_at is null for active address",
      address.deleted_at === null,
    );
  }
  // 9. Validate address data independence
  TestValidator.notEquals(
    "home and work have different recipient names",
    homeAddress.recipient_name,
    workAddress.recipient_name,
  );
  TestValidator.notEquals(
    "home and work have different street addresses",
    homeAddress.street_address,
    workAddress.street_address,
  );
  TestValidator.notEquals(
    "home and family have different cities",
    homeAddress.city,
    familyAddress.city,
  );
  // 10. Validate default address flag
  TestValidator.predicate(
    "home address is default",
    homeAddress.is_default === true,
  );
  TestValidator.predicate(
    "work address is not default",
    workAddress.is_default === false,
  );
  TestValidator.predicate(
    "family address is not default",
    familyAddress.is_default === false,
  );
}
