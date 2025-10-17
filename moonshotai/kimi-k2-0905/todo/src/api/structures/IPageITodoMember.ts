import { IPage } from "./IPage";
import { ITodoMember } from "./ITodoMember";

export namespace IPageITodoMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoMember.ISummary[];
  };
}
