import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function postShoppingMallActorsSellers(props: {
  body: IShoppingMallSeller.ICreate;
}): Promise<IShoppingMallSeller.IRegistrationResponse> {
  const id = v4() as string & tags.Format<"uuid">;
  const hashedPassword = await PasswordUtil.hash(
    (props.body as unknown as { password: string }).password,
  );

  const createdSeller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id,
      email: (props.body as unknown as { email: string }).email,
      password_hash: hashedPassword,
      business_name: (props.body as unknown as { business_name: string })
        .business_name,
      business_address: (props.body as unknown as { business_address: string })
        .business_address,
      tax_id: (props.body as unknown as { tax_id: string }).tax_id,
      status: "pending_verification",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  return createdSeller.id;
}
