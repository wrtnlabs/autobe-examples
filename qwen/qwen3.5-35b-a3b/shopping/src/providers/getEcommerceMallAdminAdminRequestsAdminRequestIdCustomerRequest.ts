import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminRequestRequestAtCustomerDetailTransformer } from "../transformers/EcommerceMallAdminRequestRequestAtCustomerDetailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminRequestsAdminRequestIdCustomerRequest(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminRequestRequest.ICustomerDetail> {
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findUniqueOrThrow(
      {
        where: { id: props.adminRequestId },
        ...EcommerceMallAdminRequestRequestAtCustomerDetailTransformer.select(),
      },
    );
  return await EcommerceMallAdminRequestRequestAtCustomerDetailTransformer.transform(
    request,
  );
}
