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

export async function patchEconomicPoliticalBoardAdminRequestsRequestIdReject(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardAdministratorRequest.IReject;
}): Promise<IEconomicPoliticalBoardAdministratorRequest> {
  // 1. Verify request exists and is pending
  const request =
    await MyGlobal.prisma.economic_political_board_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EconomicPoliticalBoardAdministratorRequestTransformer.select(),
      },
    );
  if (request.status !== "pending") {
    throw new HttpException("Request is not in pending status", 400);
  }
  // 2. Verify admin has super grade
  const administrator =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: {
          id: props.admin.id,
          grade: "super",
        },
      },
    );
  if (administrator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate review_notes is non-empty
  if (
    props.body.review_notes === null ||
    props.body.review_notes.trim().length === 0
  ) {
    throw new HttpException("Review notes are required", 400);
  }
  // 4. Update request
  await MyGlobal.prisma.economic_political_board_administrator_requests.update({
    where: { id: props.requestId },
    data: {
      status: "rejected",
      review_notes: props.body.review_notes,
      reviewed_by_admin_id: props.admin.id,
      reviewed_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 5. Fetch updated request and transform
  const updated =
    await MyGlobal.prisma.economic_political_board_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EconomicPoliticalBoardAdministratorRequestTransformer.select(),
      },
    );
  return EconomicPoliticalBoardAdministratorRequestTransformer.transform(
    updated,
  );
}
