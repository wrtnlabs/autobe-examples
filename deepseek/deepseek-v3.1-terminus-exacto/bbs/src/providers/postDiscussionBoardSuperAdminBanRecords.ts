import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardBanRecordCollector } from "../collectors/DiscussionBoardBanRecordCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardSuperAdminBanRecords(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardBanRecord.ICreate;
}): Promise<IDiscussionBoardBanRecord> {
  try {
    // Create ban record using collector
    const created = await MyGlobal.prisma.discussion_board_ban_records.create({
      data: await DiscussionBoardBanRecordCollector.collect({
        body: props.body,
      }),
      ...DiscussionBoardBanRecordTransformer.select(),
    });
    // Create attribution record for super admin using proper relation syntax
    await MyGlobal.prisma.discussion_board_ban_record_of_super_admins.create({
      data: {
        id: v4(),
        banRecord: {
          connect: {
            id: created.id,
          },
        },
        superAdmin: {
          connect: {
            id: props.superAdmin.id,
          },
        },
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    // Transform and return the result
    return await DiscussionBoardBanRecordTransformer.transform(created);
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException("Failed to create ban record", 500);
  }
}
