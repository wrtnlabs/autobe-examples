import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminEscalationQueuesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the escalation queue record exists
  const escalation =
    await MyGlobal.prisma.shopping_mall_escalation_queues.findUnique({
      where: { id: props.id },
    });
  if (!escalation) {
    throw new HttpException("Escalation queue entry not found.", 404);
  }
  // Only allow deletion if status is 'closed' or 'resolved'
  if (escalation.status !== "closed" && escalation.status !== "resolved") {
    throw new HttpException(
      "Cannot delete escalation queue entry unless its status is 'closed' or 'resolved'.",
      409,
    );
  }
  await MyGlobal.prisma.shopping_mall_escalation_queues.delete({
    where: { id: props.id },
  });
}
