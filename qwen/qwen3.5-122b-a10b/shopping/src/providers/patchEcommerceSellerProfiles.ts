import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCustomerTransformer } from "../transformers/EcommerceCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerProfiles(props: {
  seller: SellerPayload;
  body: IEcommerceCustomer.IUpdate;
}): Promise<IEcommerceCustomer> {
  // Validate display_name if provided
  if (props.body.display_name !== undefined) {
    if (props.body.display_name.length < 1) {
      throw new HttpException("Display name must be non-empty", 400);
    }
    if (props.body.display_name.length > 100) {
      throw new HttpException("Display name exceeds maximum length", 400);
    }
  }
  // Verify customer exists and is not deleted
  await MyGlobal.prisma.ecommerce_customers.findFirstOrThrow({
    where: {
      id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Update customer profile
  await MyGlobal.prisma.ecommerce_customers.update({
    where: { id: props.seller.id },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and transform updated record
  const updated = await MyGlobal.prisma.ecommerce_customers.findUniqueOrThrow({
    where: { id: props.seller.id },
    ...EcommerceCustomerTransformer.select(),
  });
  return await EcommerceCustomerTransformer.transform(updated);
}
