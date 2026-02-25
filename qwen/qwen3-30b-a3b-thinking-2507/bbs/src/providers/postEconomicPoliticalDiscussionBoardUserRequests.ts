import { IEconomicPoliticalDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdminRequest";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardAdminRequestCollector } from "../collectors/EconomicPoliticalDiscussionBoardAdminRequestCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicPoliticalDiscussionBoardAdminRequestTransformer } from "../transformers/EconomicPoliticalDiscussionBoardAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalDiscussionBoardUserRequests(props: {
  user: UserPayload;
  body: IEconomicPoliticalDiscussionBoardAdminRequest.ICreate;
}): Promise<IEconomicPoliticalDiscussionBoardAdminRequest> {
  const created =
    await MyGlobal.prisma.economic_political_discussion_board_admin_requests.create(
      {
        data: await EconomicPoliticalDiscussionBoardAdminRequestCollector.collect(
          {
            body: props.body,
            economicPoliticalDiscussionBoardUsers: props.user,
          },
        ),
        ...EconomicPoliticalDiscussionBoardAdminRequestTransformer.select(),
      },
    );
  return await EconomicPoliticalDiscussionBoardAdminRequestTransformer.transform(
    created,
  );
}
