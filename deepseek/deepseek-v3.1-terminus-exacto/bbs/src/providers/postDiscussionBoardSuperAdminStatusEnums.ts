import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardStatusEnumCollector } from "../collectors/DiscussionBoardStatusEnumCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardStatusEnumTransformer } from "../transformers/DiscussionBoardStatusEnumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardSuperAdminStatusEnums(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardStatusEnum.ICreate;
}): Promise<IDiscussionBoardStatusEnum> {
  try {
    // Use the collector to transform the request body to database input
    const data = await DiscussionBoardStatusEnumCollector.collect({
      body: props.body,
    });
    // Create the status enumeration record
    const created = await MyGlobal.prisma.discussion_board_status_enums.create({
      data,
      ...DiscussionBoardStatusEnumTransformer.select(),
    });
    // Transform the database result to response DTO
    return await DiscussionBoardStatusEnumTransformer.transform(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle unique constraint violation
      if (error.code === "P2002") {
        throw new HttpException(
          "Status enumeration with this entity_type and value combination already exists",
          409,
        );
      }
    }
    // Re-throw other errors
    throw error;
  }
}
