import { SwaggerCustomizer  from "@nestia/core";
import { ExecutionContext, createParamDecorator  from "@nestjs/common";
import { Singleton  from "tstl";
import { memberAuthorize  from "../providers/authorize/memberAuthorize";

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return memberAuthorize(request);
  })(),
);

export const MemberAuth = (): ParameterDecorator => (
  target: object,
  propertyKey: string | symbol | undefined,
  parameterIndex: number,
) => {
  SwaggerCustomizer((props) => {
    props.route.security ??= [];
    props.route.security.push({ bearer: [] });
  })(target, propertyKey as string, undefined!);
  singleton.get()(target, propertyKey, parameterIndex);
};