import { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardHealthCheckTransformer } from "../transformers/DiscussionBoardHealthCheckTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorHealthChecksId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardHealthCheck.IUpdate;
}): Promise<IDiscussionBoardHealthCheck> {
  await MyGlobal.prisma.discussion_board_health_checks.findUniqueOrThrow({
    where: { id: props.id },
  });
  const isDate = (value: unknown): value is Date => {
    return (
      typeof value === "object" &&
      value !== null &&
      typeof (value as any).getTime === "function"
    );
  };
  let updatedAt: string & tags.Format<"date-time">;
  if (props.body.updatedAt !== undefined && props.body.updatedAt !== null) {
    if (isDate(props.body.updatedAt)) {
      updatedAt = toISOStringSafe(props.body.updatedAt);
    } else {
      updatedAt = props.body.updatedAt;
    }
  } else {
    updatedAt = toISOStringSafe(new Date());
  }
  let checkedAtRaw: string | null = null;
  if (props.body.checkedAt !== undefined && props.body.checkedAt !== null) {
    if (isDate(props.body.checkedAt)) {
      checkedAtRaw = toISOStringSafe(props.body.checkedAt);
    } else {
      checkedAtRaw = props.body.checkedAt;
    }
  } else {
    checkedAtRaw = null;
  }
  const checkedAt = (checkedAtRaw === null
    ? undefined
    : checkedAtRaw) satisfies
    | (string & tags.Format<"date-time">)
    | undefined as (string & tags.Format<"date-time">) | undefined;
  await MyGlobal.prisma.discussion_board_health_checks.update({
    where: { id: props.id },
    data: {
      status: props.body.status,
      checked_at: checkedAt,
      details: props.body.details ?? null,
      updated_at: updatedAt,
    },
  });
  const record =
    await MyGlobal.prisma.discussion_board_health_checks.findUniqueOrThrow({
      where: { id: props.id },
      ...DiscussionBoardHealthCheckTransformer.select(),
    });
  return await DiscussionBoardHealthCheckTransformer.transform(record);
}
