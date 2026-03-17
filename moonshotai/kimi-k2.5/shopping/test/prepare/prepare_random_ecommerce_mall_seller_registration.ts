import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_seller_registration(
  input?: DeepPartial<IEcommerceMallSellerRegistration.ICreate>,
): IEcommerceMallSellerRegistration.ICreate {
  return {
    taxIdentificationNumber:
      input?.taxIdentificationNumber ?? RandomGenerator.alphaNumeric(12),
    businessRegistrationNumber:
      input?.businessRegistrationNumber ?? RandomGenerator.alphaNumeric(10),
    businessName: input?.businessName ?? RandomGenerator.name(3),
    businessAddress:
      input?.businessAddress ?? RandomGenerator.paragraph({ sentences: 2 }),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
