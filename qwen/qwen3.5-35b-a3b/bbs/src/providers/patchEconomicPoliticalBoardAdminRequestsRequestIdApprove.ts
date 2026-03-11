import { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardAdministratorRequestTransformer } from "../transformers/EconomicPoliticalBoardAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardAdminRequestsRequestIdApprove(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardAdministratorRequest.IUpdate;
}): Promise<IEconomicPoliticalBoardAdministratorRequest> {
  const reviewNotesValue = props.body.review_notes;
  const request =
    await MyGlobal.prisma.economic_political_board_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          user_id: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException("Request already reviewed", 409);
  }
  const administrator =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findUnique(
      {
        where: { id: props.admin.id },
        select: { grade: true },
      },
    );
  if (administrator === null || administrator.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  const [updatedRequest] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.economic_political_board_administrator_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        reviewed_by_admin_id: props.admin.id,
        reviewed_at: toISOStringSafe(new Date()),
        review_notes: reviewNotesValue ?? null,
        updated_at: toISOStringSafe(new Date()),
      },
    }),
    MyGlobal.prisma.economic_political_board_administrator_roles.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: request.user_id,
        grade: "regular",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    }),
  ]);
  const selected =
    await MyGlobal.prisma.economic_political_board_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EconomicPoliticalBoardAdministratorRequestTransformer.select(),
      },
    );
  return await EconomicPoliticalBoardAdministratorRequestTransformer.transform(
    selected,
  );
}
