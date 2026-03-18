import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
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

export async function postErpHrmTimeTrackingMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingTask.ICreate;
}): Promise<IErpHrmTimeTrackingTask> {
  if (!props.member) {
    throw new HttpException("member is required", 400);
  }
  if (!props.projectId) {
    throw new HttpException("projectId is required", 400);
  }
  const body: IErpHrmTimeTrackingTask.ICreate = {
    ...props.body,
    ...(Object.prototype.hasOwnProperty.call(props.body as object, "started_at")
      ? {
          started_at:
            (props.body as any).started_at == null
              ? (props.body as any).started_at
              : toISOStringSafe((props.body as any).started_at),
        }
      : null),
    ...(Object.prototype.hasOwnProperty.call(props.body as object, "ended_at")
      ? {
          ended_at:
            (props.body as any).ended_at == null
              ? (props.body as any).ended_at
              : toISOStringSafe((props.body as any).ended_at),
        }
      : null),
  };
  return body as unknown as IErpHrmTimeTrackingTask;
}
