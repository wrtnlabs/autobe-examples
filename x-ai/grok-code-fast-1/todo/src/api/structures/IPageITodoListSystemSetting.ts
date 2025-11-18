import { IPage } from "./IPage";
import { ITodoListSystemSetting } from "./ITodoListSystemSetting";

export namespace IPageITodoListSystemSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoListSystemSetting.ISummary[];
  };
}
