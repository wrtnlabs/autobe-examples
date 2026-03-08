import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdministratorRequestCollector } from "../collectors/DiscussionBoardAdministratorRequestCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAdministratorRequestTransformer } from "../transformers/DiscussionBoardAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberRequests(props: {
  member: MemberPayload;
  body: IDiscussionBoardAdministratorRequest.ICreate;
}): Promise<IDiscussionBoardAdministratorRequest> {
  const request =
    await MyGlobal.prisma.discussion_board_administrator_requests.create({
      data: await DiscussionBoardAdministratorRequestCollector.collect({
        body: props.body,
        member: { id: props.member.id },
      }),
      ...DiscussionBoardAdministratorRequestTransformer.select(),
    });
  return await DiscussionBoardAdministratorRequestTransformer.transform(
    request,
  );
}
