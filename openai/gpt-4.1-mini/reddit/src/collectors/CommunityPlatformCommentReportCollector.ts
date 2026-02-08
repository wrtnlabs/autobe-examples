import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(input: Date | null): string | null {
  if (input === null) return null;
  if (input instanceof Date) return input.toISOString();
  return null;
}
export namespace CommunityPlatformCommentReportCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommentReport.ICreate;
    comment: IEntity;
    reporterUser: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      status: "pending",
      created_at: toISOStringSafe(new Date())!,
      updated_at: toISOStringSafe(new Date())!,
      deleted_at: null,
      comment: { connect: { id: props.comment.id } },
      reporterUser: { connect: { id: props.reporterUser.id } },
    } satisfies Prisma.community_platform_comment_reportsCreateInput;
  }
}
