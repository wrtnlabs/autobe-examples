import { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random customer shipping address creation data for E2E testing.
 *
 * Generates a complete IECommerceMallCustomerAddress.ICreate with randomized
 * recipient and location details. All string fields produce non-empty values.
 *
 * The `is_default` field is optional; when omitted, the system automatically
 * determines whether to set it as default based on the customer's existing
 * addresses. The authenticated customer identity is automatically associated
 * via JWT session token at the API level.
 */
export function prepare_random_ecommerce_mall_customer_address(
  input?: DeepPartial<IECommerceMallCustomerAddress.ICreate> | undefined,
): IECommerceMallCustomerAddress.ICreate {
  return {
    recipient_name: input?.recipient_name ?? RandomGenerator.name(),
    phone_number: input?.phone_number ?? RandomGenerator.mobile(),
    street_address:
      input?.street_address ?? RandomGenerator.paragraph({ sentences: 2 }),
    city: input?.city ?? RandomGenerator.name(1),
    state_province: input?.state_province ?? RandomGenerator.name(1),
    postal_code: input?.postal_code ?? RandomGenerator.alphaNumeric(6),
    country: input?.country ?? RandomGenerator.name(1),
    is_default: input?.is_default ?? undefined,
  };
}
