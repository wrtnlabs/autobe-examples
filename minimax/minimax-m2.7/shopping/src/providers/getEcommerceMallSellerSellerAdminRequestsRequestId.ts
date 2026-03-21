import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerAdminRequestTransformer } from "../transformers/EcommerceMallSellerAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSellerAdminRequestsRequestId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerAdminRequest> {
  const request =
    await MyGlobal.prisma.ecommerce_mall_seller_admin_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
          deleted_at: null,
        },
        ...EcommerceMallSellerAdminRequestTransformer.select(),
      },
    );
  if (request.seller.id !== props.seller.id) {
    throw new HttpException("Not Found", 404);
  }
  return await EcommerceMallSellerAdminRequestTransformer.transform(request);
}
