import { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardFeatureFlagCollector } from "../collectors/DiscussionBoardFeatureFlagCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorFeatureFlags(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardFeatureFlag.ICreate;
}): Promise<IDiscussionBoardFeatureFlag> {
  try {
    const now = new Date().toISOString() as string &
      import("typia").tags.Format<"date-time">;

    const id = v4() as string & import("typia").tags.Format<"uuid">;

    const data = await DiscussionBoardFeatureFlagCollector.collect({
      body: props.body,
    });
    const created = await MyGlobal.prisma.discussion_board_feature_flags.create(
      {
        data: {
          ...data,
          id: id,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      },
    );
    return {
      id: created.id,
      code: created.code,
      name: created.name,
      description: created.description,
      enabled: created.enabled,
      created_at: created.created_at,
      updated_at: created.updated_at,
      deleted_at: created.deleted_at,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      /unique constraint|unique violation|duplicate key/.test(
        error.message.toLowerCase(),
      )
    ) {
      throw new HttpException("Feature flag code must be unique", 400);
    }
    throw error;
  }
}
