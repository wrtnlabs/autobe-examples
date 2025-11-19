import { ForbiddenException } from '@nestjs/common';
import { MyGlobal } from '../../MyGlobal';
import { jwtAuthorize } from './jwtAuthorize';
import { RegisteredUserPayload } from '../../decorators/payload/RegisteredUserPayload';

export async function registeredUserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<RegisteredUserPayload> {
  const payload: RegisteredUserPayload = jwtAuthorize({ request }) as RegisteredUserPayload;
  if (payload.type !== 'registered_user') {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }
  const user = await MyGlobal.prisma.discussion_board_registered_users.findFirst({
    where: { id: payload.id },
  });
  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }
  return payload;
}