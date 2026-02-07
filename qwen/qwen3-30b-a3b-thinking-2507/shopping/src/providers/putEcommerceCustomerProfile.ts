import { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEcommerceDefaultAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDefaultAddress";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerTransformer } from "../transformers/EcommerceCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceCustomerProfile(props: {
  customer: CustomerPayload;
  body: IEcommerceCustomer.IUpdate;
}): Promise<IEcommerceCustomer> {
  const prohibitedTerms = ["admin", "staff", "system"];
  // Validate display_name
  const displayName = props.body.display_name;
  if (displayName !== null && displayName !== undefined) {
    if (displayName.length > 50) {
      throw new HttpException("Display name too long (max 50 characters)", 400);
    }
    if (
      prohibitedTerms.some((term) => displayName.toLowerCase().includes(term))
    ) {
      throw new HttpException("Display name contains prohibited terms", 400);
    }
  }
  // Validate phone (E.164 format)
  const phone = props.body.phone;
  if (phone !== null && phone !== undefined) {
    const e164Regex = /^\+?[1-9]\d{1,14}$/;
    if (!e164Regex.test(phone)) {
      throw new HttpException("Invalid phone number format", 400);
    }
  }
  await MyGlobal.prisma.ecommerce_customers.update({
    where: { id: props.customer.id },
    data: {
      display_name: displayName ?? null,
      phone: phone ?? null,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updatedCustomer = await MyGlobal.prisma.ecommerce_customers.findUnique({
    where: { id: props.customer.id },
    ...EcommerceCustomerTransformer.select(),
  });
  return EcommerceCustomerTransformer.transform(updatedCustomer!);
}
