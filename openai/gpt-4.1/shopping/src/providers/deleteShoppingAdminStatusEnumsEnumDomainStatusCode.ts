import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminStatusEnumsEnumDomainStatusCode(props: {
  admin: AdminPayload;
  enumDomain: string;
  statusCode: string;
}): Promise<void> {
  try {
    await MyGlobal.prisma.shopping_status_enums.delete({
      where: {
        enum_domain_status_code: {
          enum_domain: props.enumDomain,
          status_code: props.statusCode,
        },
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      throw new HttpException("Status enum not found", 404);
    }
    throw err;
  }
}
