import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
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

export async function putErpHrmTimeTrackingMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingProject.IUpdate;
}): Promise<IErpHrmTimeTrackingProject> {
  const now = new Date();
  const result = {
    ...(props.body as unknown as object),
    id:
      (
        props.body as unknown as {
          id?: string;
        }
      ).id ?? (props.projectId as unknown as string),
    project_id:
      (
        props.body as unknown as {
          project_id?: string;
        }
      ).project_id ?? (props.projectId as unknown as string),
    member_id:
      (
        props.member as unknown as {
          member_id?: string;
        }
      ).member_id ??
      (
        props.member as unknown as {
          id?: string;
        }
      ).id,
    updated_at: toISOStringSafe(
      (
        props.body as unknown as {
          updated_at?: Date | string | null;
        }
      )?.updated_at ?? now,
    ),
    created_at: toISOStringSafe(
      (
        props.body as unknown as {
          created_at?: Date | string | null;
        }
      )?.created_at ?? now,
    ),
  };
  return result as unknown as IErpHrmTimeTrackingProject;
}
