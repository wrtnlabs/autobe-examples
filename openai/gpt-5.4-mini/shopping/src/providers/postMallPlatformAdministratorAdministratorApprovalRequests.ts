import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformAdministratorApprovalRequestCollector } from "../collectors/MallPlatformAdministratorApprovalRequestCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformAdministratorApprovalRequestTransformer } from "../transformers/MallPlatformAdministratorApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAdministratorAdministratorApprovalRequests(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformAdministratorApprovalRequest.ICreate;
}): Promise<IMallPlatformAdministratorApprovalRequest> {
  const existing =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findFirst(
      {
        where: {
          administrator_id: props.administrator.id,
          status: {
            notIn: ["approved", "rejected"],
          },
        },
        select: {
          id: true,
        },
      },
    );
  if (existing !== null) {
    throw new HttpException("Duplicate administrator approval request", 409);
  }
  try {
    const created =
      await MyGlobal.prisma.mall_platform_administrator_approval_requests.create(
        {
          data: await MallPlatformAdministratorApprovalRequestCollector.collect(
            {
              body: props.body,
              administrator: {
                id: props.administrator.id,
              },
            },
          ),
          ...MallPlatformAdministratorApprovalRequestTransformer.select(),
        },
      );
    return await MallPlatformAdministratorApprovalRequestTransformer.transform(
      created,
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException(
          "Duplicate administrator approval request",
          409,
        );
      }
    }
    throw error;
  }
}
