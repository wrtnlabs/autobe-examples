import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorSections(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSection.ICreate;
}): Promise<IDiscussionBoardSection> {
  const name = (
    props.body as {
      name: string;
    }
  ).name satisfies string as string;
  const description = (
    props.body as {
      description: string;
    }
  ).description satisfies string as string;
  if (!name || name.trim() === "") {
    throw new HttpException("Name must be provided and non-empty", 400);
  }
  if (!description || description.trim() === "") {
    throw new HttpException("Description must be provided and non-empty", 400);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  try {
    const created = await MyGlobal.prisma.discussion_board_sections.create({
      data: {
        id,
        name,
        description,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: created.id,
      name: created.name,
      description: created.description,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("name")
    ) {
      throw new HttpException(`Section name already exists`, 400);
    }
    throw error;
  }
}
