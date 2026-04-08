import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceCustomerTransformer } from "../transformers/EcommerceCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminProfiles(props: {
  admin: AdminPayload;
  body: IEcommerceCustomer.IUpdate;
}): Promise<IEcommerceCustomer> {
  await MyGlobal.prisma.ecommerce_customers.findUniqueOrThrow({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  } satisfies Prisma.ecommerce_customersFindUniqueArgs);
  const updated = await MyGlobal.prisma.ecommerce_customers.update({
    where: { id: props.admin.id },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      updated_at: new Date(),
    },
    ...EcommerceCustomerTransformer.select(),
  });
  return await EcommerceCustomerTransformer.transform(updated);
}
