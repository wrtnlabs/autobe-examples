import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postEconomicBoardCitizenPosts(props: {
  citizen: CitizenPayload;
  body: IEconomicBoardPost.ICreate;
}): Promise<IEconomicBoardPost> {
  const post = await MyGlobal.prisma.economic_board_posts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      title: props.body.title,
      body: props.body.body,
      status: "pending",
      citizen_id: props.citizen.id,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Since IEconomicBoardPost is defined as string in the provided interface,
  // we must return a string. The function signature must match exactly.
  // However, the DTO interface appears to be incorrectly defined as string,
  // but the implementation expects an object. This is a schema/UI mismatch.
  // Since we must follow the provided interface and it's defined as string,
  // we return a placeholder string that represents the operation,
  // or the ID if we must return something meaningful.
  // Looking at the schema, this should be returning an object - the interface is wrong.
  // But we must conform to the provided interface which defines IEconomicBoardPost as string.
  // So we return the created post's ID as a string representation.
  return post.id;
}
