import { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportSnapshotCollector {
  export async function collect(props: {
    body: ICommunityPlatformReportSnapshot.ICreate;
    report: IEntity;
    reportTarget: IEntity;
    reviewedByAdmin?: IEntity;
    reviewedByMember?: IEntity;
  }) {
    const id: string = v4();
    const capturedAt: Date = new Date();
    const createdAt: Date = new Date();
    const updatedAt: Date = new Date();
    return {
      id,
      snapshot_reason: props.body.snapshot_reason,
      snapshot_status: props.body.snapshot_status,
      snapshot_decisioned_at:
        props.body.snapshot_decisioned_at === undefined ||
        props.body.snapshot_decisioned_at === null
          ? null
          : new Date(props.body.snapshot_decisioned_at),
      captured_at: capturedAt,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
      report: { connect: { id: props.report.id } },
      reportTarget: { connect: { id: props.reportTarget.id } },
      reviewedByAdmin: props.reviewedByAdmin
        ? { connect: { id: props.reviewedByAdmin.id } }
        : undefined,
      reviewedByMember: props.reviewedByMember
        ? { connect: { id: props.reviewedByMember.id } }
        : undefined,
      resolution:
        props.body.community_platform_report_resolution_id === undefined ||
        props.body.community_platform_report_resolution_id === null
          ? undefined
          : {
              connect: {
                id: props.body.community_platform_report_resolution_id,
              },
            },
    } satisfies Prisma.community_platform_report_snapshotsCreateInput;
  }
}
