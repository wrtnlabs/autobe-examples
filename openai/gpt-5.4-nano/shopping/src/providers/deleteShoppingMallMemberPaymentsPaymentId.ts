import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallMemberPaymentsPaymentId(props: {
  member: MemberPayload;
  paymentId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_payments.findUniqueOrThrow({
      where: { id: props.paymentId },
      select: { id: true },
    });
    try {
      await tx.shopping_mall_payments.delete({
        where: { id: props.paymentId },
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2003" || e.code === "P2002") {
          throw new HttpException(
            "Payment cannot be erased due to existing related records",
            409,
          );
        }
      }
      throw e;
    }
  });
}
